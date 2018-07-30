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
package org.apache.qpid.systest.core.util;

import java.util.ArrayList;
import java.util.List;

import javax.jms.Connection;
import javax.jms.Destination;
import javax.jms.JMSException;
import javax.jms.Message;
import javax.jms.MessageProducer;
import javax.jms.Session;

public class Utils
{
    private static final int DEFAULT_MESSAGE_SIZE = 1024;
    public static final String INDEX = "index";
    private static final String DEFAULT_MESSAGE_PAYLOAD = createString(DEFAULT_MESSAGE_SIZE);

    public static void sendTextMessage(final Connection connection, final Destination destination, String message)
            throws JMSException
    {
        Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        try
        {
            MessageProducer producer = session.createProducer(destination);
            producer.send(session.createTextMessage(message));
        }
        finally
        {
            session.close();
        }
    }

    public static void sendMessages(final Connection connection, final Destination destination, final int count)
            throws JMSException
    {
        Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        try
        {
            sendMessages(session, destination, count);
        }
        finally
        {
            session.close();
        }
    }

    public static List<Message> sendMessages(Session session, Destination destination, int count) throws JMSException
    {
        List<Message> messages = new ArrayList<>(count);
        MessageProducer producer = session.createProducer(destination);

        for (int i = 0; i < (count); i++)
        {
            Message next = createNextMessage(session, i);
            producer.send(next);
            messages.add(next);
        }

        if (session.getTransacted())
        {
            session.commit();
        }

        return messages;
    }

    public static Message createNextMessage(Session session, int msgCount) throws JMSException
    {
        Message message = createMessage(session, DEFAULT_MESSAGE_SIZE);
        message.setIntProperty(INDEX, msgCount);

        return message;
    }

    public static Message createMessage(Session session, int messageSize) throws JMSException
    {
        String payload;
        if (messageSize == DEFAULT_MESSAGE_SIZE)
        {
            payload = DEFAULT_MESSAGE_PAYLOAD;
        }
        else
        {
            payload = createString(messageSize);
        }

        return session.createTextMessage(payload);
    }

    private static String createString(final int stringSize)
    {
        final String payload;
        StringBuilder stringBuilder = new StringBuilder();
        for (int i = 0; i < stringSize; ++i)
        {
            stringBuilder.append("x");
        }
        payload = stringBuilder.toString();
        return payload;
    }
}