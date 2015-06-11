/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */
package org.apache.qpid.server.model;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

import org.codehaus.jackson.map.ObjectMapper;

import org.apache.qpid.test.utils.QpidTestCase;

public class ConfiguredObjectJacksonModuleTest extends QpidTestCase
{
    public void testManageableAttributeType() throws IOException
    {
        ManagedAttributeValue testType = new TestManagedAttributeValue();

        ObjectMapper encoder = ConfiguredObjectJacksonModule.newObjectMapper();
        String encodedValue = encoder.writeValueAsString(testType);
        ObjectMapper decoder = new ObjectMapper();
        Map decodedMap = decoder.readValue(encodedValue, Map.class);
        assertEquals(3, decodedMap.size());
        assertTrue(decodedMap.containsKey("name"));
        assertTrue(decodedMap.containsKey("map"));
        assertTrue(decodedMap.containsKey("type"));
        assertEquals("foo", decodedMap.get("name"));
        assertEquals(Collections.singletonMap("key","value"), decodedMap.get("map"));
        assertEquals(Collections.singletonMap("nested",true), decodedMap.get("type"));

    }

    @ManagedAttributeValueType
    private static class TestManagedAttributeValue implements ManagedAttributeValue
    {
        public String getName()
        {
            return "foo";
        }

        public Map<String,String> getMap()
        {
            return Collections.singletonMap("key", "value");
        }

        public NestedManagedAttributeValue getType()
        {
            return new NestedManagedAttributeValue();
        }


    }

    @ManagedAttributeValueType
    private static class NestedManagedAttributeValue implements ManagedAttributeValue
    {
        public boolean isNested()
        {
            return true;
        }
    }
}